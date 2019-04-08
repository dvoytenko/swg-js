/**
 * Copyright 2019 The Subscribe with Google Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {Xhr} from '../utils/xhr';
import * as ServiceUrl from './services';

/**
 * Implements interface to Propensity server
 */
export class PropensityServer {
  /**
   * Page configuration is known when Propensity API
   * is available, publication ID is therefore used
   * in constructor for the server interface.
   * @param {string} publicationId
   */
  constructor(win, publicationId) {
    /** @private @const {!Window} */
    this.win_ = win;
    /** @private @const {string} */
    this.publicationId_ = publicationId;
    /** @private {?string} */
    this.clientId_ = null;
    /** @private {boolean} */
    this.userConsent_ = false;
    /** @private @const {!Xhr} */
    this.xhr_ = new Xhr(win);
  }

  /**
   * @private
   * @return {string}
   */
  getDocumentCookie_() {
    return this.win_.document.cookie;
  }

  /**
   * Returns the client ID to be used.
   * @return {?string}
   * @private
   */
  getClientId_() {
    // No cookie is sent when user consent is not available.
    if (!this.userConsent_) {
      return 'noConsent';
    }
    // When user consent is available, get the first party cookie
    // for Google Ads.
    if (!this.clientId_) {
      // Match '__gads' (name of the cookie) dropped by Ads Tag.
      const gadsmatch = this.getDocumentCookie_().match(
          '(^|;)\\s*__gads\\s*=\\s*([^;]+)');
      // Since the cookie will be consumed using decodeURIComponent(),
      // use encodeURIComponent() here to match.
      this.clientId_ = gadsmatch && encodeURIComponent(gadsmatch.pop());
    }
    return this.clientId_;
  }

  /**
   * @param {boolean} userConsent
   */
  setUserConsent(userConsent) {
    this.userConsent_ = userConsent;
  }

  /**
   * @param {string} state
   * @param {?string} entitlements
   */
  sendSubscriptionState(state, entitlements) {
    const init = /** @type {!../utils/xhr.FetchInitDef} */ ({
      method: 'GET',
      credentials: 'include',
    });
    const clientId = this.getClientId_();
    let userState = this.publicationId_ + ':' + state;
    if (entitlements) {
      userState = userState + ':' + encodeURIComponent(entitlements);
    }
    let url = ServiceUrl.adsUrl('/subopt/data?states=')
        + encodeURIComponent(userState);
    if (clientId) {
      url = url + '&cookie=' + clientId;
    }
    url = url + '&u_tz=240';
    return this.xhr_.fetch(url, init);
  }

  /**
   * @param {string} event
   * @param {?string} context
   */
  sendEvent(event, context) {
    const init = /** @type {!../utils/xhr.FetchInitDef} */ ({
      method: 'GET',
      credentials: 'include',
    });
    const clientId = this.getClientId_();
    let eventInfo = this.publicationId_ + ':' + event;
    if (context) {
      eventInfo = eventInfo + ':' + encodeURIComponent(context);
    }
    let url = ServiceUrl.adsUrl('/subopt/data?events=')
        + encodeURIComponent(eventInfo);
    if (clientId) {
      url = url + '&cookie=' + clientId;
    }
    url = url + '&u_tz=240';
    return this.xhr_.fetch(url, init);
  }

  /**
   * @param {string} referrer
   * @param {string} type
   * @return {?Promise<JsonObject>}
   */
  getPropensity(referrer, type) {
    const clientId = this.getClientId_();
    const init = /** @type {!../utils/xhr.FetchInitDef} */ ({
      method: 'GET',
      credentials: 'include',
    });
    let url = ServiceUrl.adsUrl('/subopt/pts?products=') + this.publicationId_
        + '&type=' + type + '&u_tz=240'
        + '&ref=' + referrer;
    if (clientId) {
      url = url + '&cookie=' + clientId;
    }
    return this.xhr_.fetch(url, init).then(result => result.json())
        .then(score => {
          if (!score) {
            score = "{'values': [-1]}";
          }
          return score;
        });
  }
}